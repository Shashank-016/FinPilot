import pandas as pd


def parse_hdfc_statement(file):
    df_raw = pd.read_excel(file, header=None)

    header_row = None
    for index, row in df_raw.iterrows():
        values = {str(value).strip() for value in row.values if pd.notna(value)}
        if "Date" in values:
            header_row = index
            break

    if header_row is None:
        raise ValueError("Could not find transaction table header")

    file.seek(0)
    df = pd.read_excel(file, header=header_row)
    df.columns = [str(column).strip() for column in df.columns]

    df = df.rename(
        columns={
            "Date": "date",
            "Narration": "description",
            "Withdrawal Amt.": "debit",
            "Deposit Amt.": "credit",
        }
    )

    required_columns = {"date", "description", "debit", "credit"}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        raise ValueError(f"Missing columns in statement: {', '.join(sorted(missing_columns))}")

    df = df[df["date"].notna()].copy()
    df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=True, errors="coerce")
    df["description"] = df["description"].fillna("")

    df["debit"] = _to_amount(df["debit"])
    df["credit"] = _to_amount(df["credit"])
    df["amount"] = df["debit"].fillna(0) + df["credit"].fillna(0)
    df["type"] = df.apply(
        lambda row: "expense" if pd.notna(row["debit"]) and row["debit"] > 0 else "income",
        axis=1,
    )

    df = df[
        (df["date"].notna())
        & (df["amount"] > 0)
        & (~df["description"].str.contains(r"\*{3,}", na=False))
    ]

    return df[["date", "description", "amount", "type"]]


def _to_amount(series):
    return pd.to_numeric(
        series.astype(str).str.replace(",", "", regex=False).str.strip(),
        errors="coerce",
    )
