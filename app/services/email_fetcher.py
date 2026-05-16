"""
EmailFetcher abstraction — swap IMAPEmailFetcher for GmailAPIFetcher later
without touching any downstream code.
"""
import imaplib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from email import message_from_bytes
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)


@dataclass
class RawEmail:
    uid: str
    subject: str
    raw: bytes
    received: datetime


class EmailFetcher(ABC):
    @abstractmethod
    def get_new_emails(self) -> list[RawEmail]:
        ...


class IMAPEmailFetcher(EmailFetcher):
    """
    Fetches unseen emails from a given sender via IMAP SSL.
    Marks fetched emails as seen so they are not processed twice.
    Replace this class with GmailAPIFetcher to migrate to Option A.
    """

    # Both known HDFC sender addresses (old domain + new domain)
    HDFC_SENDERS = ["alerts@hdfcbank.net", "alerts@hdfcbank.bank.in"]

    def __init__(
        self,
        host: str,
        email_address: str,
        password: str,
        folder: str = "INBOX",
        lookback_days: int = 7,
        max_per_poll: int = 30,
    ):
        self.host = host
        self.email_address = email_address
        self.password = password
        self.folder = folder
        self.lookback_days = lookback_days
        self.max_per_poll = max_per_poll

    def get_new_emails(self) -> list[RawEmail]:
        try:
            mail = imaplib.IMAP4_SSL(self.host)
            mail.login(self.email_address, self.password)
            mail.select(self.folder)

            since_date = (datetime.now() - timedelta(days=self.lookback_days)).strftime("%d-%b-%Y")

            # Search both HDFC sender addresses; no UNSEEN flag — DB uid dedup handles duplicates
            seen_uids: set[bytes] = set()
            all_uids: list[bytes] = []
            for sender in self.HDFC_SENDERS:
                _, data = mail.uid("search", None, f'(FROM "{sender}" SINCE {since_date})')
                for uid_bytes in (data[0].split() if data[0] else []):
                    if uid_bytes not in seen_uids:
                        seen_uids.add(uid_bytes)
                        all_uids.append(uid_bytes)

            # Most recent first, capped per poll
            all_uids = all_uids[-self.max_per_poll:]

            results: list[RawEmail] = []
            for uid_bytes in all_uids:
                uid = uid_bytes.decode()
                _, msg_data = mail.uid("fetch", uid_bytes, "(RFC822)")
                raw: bytes = msg_data[0][1]

                msg = message_from_bytes(raw)
                subject = msg.get("Subject", "")
                try:
                    received = parsedate_to_datetime(msg.get("Date", ""))
                except Exception:
                    received = datetime.now()

                results.append(RawEmail(uid=uid, subject=subject, raw=raw, received=received))

            mail.logout()
            logger.debug("IMAP fetched %d HDFC email(s) in window", len(results))
            return results

        except Exception:
            logger.exception("IMAP fetch failed")
            return []

    def diagnose(self) -> dict:
        """Connect and return recent senders/subjects to verify IMAP works and identify the HDFC sender address."""
        result: dict = {"connected": False, "error": None, "recent_senders": [], "hdfc_unseen": []}
        try:
            mail = imaplib.IMAP4_SSL(self.host)
            mail.login(self.email_address, self.password)
            mail.select(self.folder)
            result["connected"] = True

            # Last 20 emails regardless of sender/seen status
            _, data = mail.uid("search", None, "ALL")
            all_uids = (data[0].split() if data[0] else [])[-20:]
            for uid_bytes in all_uids:
                _, msg_data = mail.uid("fetch", uid_bytes, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)])")
                raw_header = msg_data[0][1]
                msg = message_from_bytes(raw_header)
                result["recent_senders"].append({
                    "uid": uid_bytes.decode(),
                    "from": msg.get("From", ""),
                    "subject": msg.get("Subject", ""),
                })

            # HDFC emails within lookback window (both known sender addresses)
            since_date = (datetime.now() - timedelta(days=self.lookback_days)).strftime("%d-%b-%Y")
            found: set[bytes] = set()
            for sender in self.HDFC_SENDERS:
                _, data2 = mail.uid("search", None, f'(FROM "{sender}" SINCE {since_date})')
                for u in (data2[0].split() if data2[0] else []):
                    found.add(u)
            result["hdfc_recent"] = [u.decode() for u in found]

            mail.logout()
        except Exception as e:
            result["error"] = str(e)
        return result
