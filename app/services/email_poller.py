import logging
import threading
import time

from app.database import SessionLocal
from app.models.transaction import Transaction
from app.repositories.category_repo import get_or_create_category
from app.repositories.transaction_repo import is_duplicate
from app.services.email_fetcher import EmailFetcher, IMAPEmailFetcher
from app.utils.categorizer import categorize_from_merchant
from app.utils.hdfc_email_parser import parse_hdfc_email
from app.utils.merchant_extractor import extract_merchant, is_transfer_transaction

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 120


def start_email_poller(user_id: str, imap_host: str, imap_email: str, imap_password: str) -> None:
    fetcher = IMAPEmailFetcher(
        host=imap_host,
        email_address=imap_email,
        password=imap_password,
        lookback_days=7,
    )
    thread = threading.Thread(
        target=_poll_loop,
        args=(user_id, fetcher),
        daemon=True,
        name="hdfc-email-poller",
    )
    thread.start()
    logger.info("HDFC email poller started (interval=%ds)", POLL_INTERVAL_SECONDS)


def _poll_loop(user_id: str, fetcher: EmailFetcher) -> None:
    while True:
        try:
            _process_batch(user_id, fetcher)
        except Exception:
            logger.exception("Unhandled error in email poller")
        time.sleep(POLL_INTERVAL_SECONDS)


def _process_batch(user_id: str, fetcher: EmailFetcher) -> None:
    raw_emails = fetcher.get_new_emails()
    if not raw_emails:
        return

    logger.info("Email poller: processing %d email(s)", len(raw_emails))
    db = SessionLocal()
    try:
        for raw_email in raw_emails:
            # Skip if we already logged this email UID
            if db.query(Transaction).filter(Transaction.email_uid == raw_email.uid).first():
                continue

            parsed = parse_hdfc_email(raw_email.raw)
            if not parsed:
                logger.debug("Could not parse email uid=%s subject=%s", raw_email.uid, raw_email.subject)
                continue

            if is_duplicate(db, user_id, parsed.transaction_date, parsed.amount, parsed.description):
                logger.debug("Duplicate transaction skipped (uid=%s)", raw_email.uid)
                continue

            if is_transfer_transaction(parsed.description):
                tx_type = "transfer"
                category_id = None
                needs_review = False
            else:
                tx_type = parsed.type
                merchant = extract_merchant(parsed.description)
                category_name = categorize_from_merchant(merchant)
                needs_review = category_name == "Other"
                category = get_or_create_category(db, category_name, tx_type)
                category_id = category.id

            transaction = Transaction(
                user_id=user_id,
                amount=parsed.amount,
                type=tx_type,
                description=parsed.description,
                transaction_date=parsed.transaction_date,
                transaction_time=parsed.transaction_time,
                category_id=category_id,
                source="email",
                email_uid=raw_email.uid,
                needs_review=needs_review,
            )
            db.add(transaction)
            db.commit()
            logger.info(
                "Logged email transaction: %s | %s | %.2f",
                parsed.transaction_date,
                parsed.description,
                parsed.amount,
            )
    finally:
        db.close()
