import html
import re
from dataclasses import dataclass
from datetime import date, datetime
from email import message_from_bytes
from email.message import Message
from typing import Optional


@dataclass
class ParsedTransaction:
    amount: float
    type: str  # "income" | "expense"
    description: str
    transaction_date: date
    transaction_time: Optional[str] = None  # "HH:MM" in 24h, extracted from email body


def parse_hdfc_email(raw_message: bytes) -> Optional[ParsedTransaction]:
    msg = message_from_bytes(raw_message)
    body = _extract_body(msg)
    if not body:
        return None
    return _parse_body(body)


def _extract_body(msg: Message) -> str:
    parts: list[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            payload = part.get_payload(decode=True)
            if not payload:
                continue
            text = payload.decode("utf-8", errors="ignore")
            if ct == "text/plain":
                parts.append(text)
            elif ct == "text/html" and not parts:
                parts.append(_strip_html(text))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            text = payload.decode("utf-8", errors="ignore")
            if msg.get_content_type() == "text/html":
                text = _strip_html(text)
            parts.append(text)
    return " ".join(parts)


def _strip_html(html_text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html_text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_body(body: str) -> Optional[ParsedTransaction]:
    body = re.sub(r"\s+", " ", body)

    is_debit = bool(re.search(r"\b(debited|debit|has been used|charged)\b", body, re.IGNORECASE))
    is_credit = bool(re.search(r"\b(credited|credit)\b", body, re.IGNORECASE))

    if not is_debit and not is_credit:
        return None

    tx_type = "expense" if is_debit else "income"

    amount_match = re.search(
        r"(?:Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)",
        body,
        re.IGNORECASE,
    )
    if not amount_match:
        return None
    amount = float(amount_match.group(1).replace(",", ""))

    description = _extract_description(body)
    tx_date = _extract_date(body)
    tx_time = _extract_time(body)

    return ParsedTransaction(
        amount=amount,
        type=tx_type,
        description=description,
        transaction_date=tx_date,
        transaction_time=tx_time,
    )


def _extract_description(body: str) -> str:
    # Savings account format: "Info: UPI-INSTAMART BLR"
    info_match = re.search(
        r"Info[:\s]+([A-Z0-9@\-\./\s]{3,60}?)(?:\.|Avl|Available|$)",
        body,
        re.IGNORECASE,
    )
    if info_match:
        return info_match.group(1).strip()

    # Credit card format: "transaction of Rs. X at MERCHANT on date"
    at_match = re.search(
        r"at\s+([A-Z0-9][A-Z0-9\.\s\-]{2,50}?)\s+on\s+\d",
        body,
        re.IGNORECASE,
    )
    if at_match:
        return at_match.group(1).strip()

    return "HDFC Transaction"


def _extract_date(body: str) -> date:
    # dd-mm-yyyy or dd/mm/yyyy
    m = re.search(r"(\d{2})[/-](\d{2})[/-](\d{2,4})", body)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        try:
            return date(y, mo, d)
        except ValueError:
            pass

    # dd-Mon-yyyy (e.g. 03-May-2026)
    m2 = re.search(r"(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})", body)
    if m2:
        try:
            return datetime.strptime(
                f"{m2.group(1)} {m2.group(2)} {m2.group(3)}", "%d %b %Y"
            ).date()
        except ValueError:
            pass

    return date.today()


def _extract_time(body: str) -> Optional[str]:
    # HH:MM:SS optionally followed by AM/PM  e.g. "15:23:05" or "03:42:38 PM"
    m = re.search(r"\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?\b", body)
    if not m:
        return None
    hour, minute, ampm = int(m.group(1)), int(m.group(2)), m.group(3)
    if ampm:
        try:
            dt = datetime.strptime(f"{hour}:{minute} {ampm.upper()}", "%I:%M %p")
            return dt.strftime("%H:%M")
        except ValueError:
            return None
    if 0 <= hour <= 23:
        return f"{hour:02d}:{minute:02d}"
    return None
