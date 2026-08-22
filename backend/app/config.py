from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding="utf-8")

    # App & Server
    app_name: str = "HealLock"
    environment: str = "development"  # development | production
    host: str = "127.0.0.1"
    port: int = 8000

    # Database (SQLite default for local, or PostgreSQL / Supabase / Neon connection string)
    database_url: str = "sqlite:///./heallock.db"

    # Security & Encryption (AES-GCM 256-bit symmetric encryption key)
    secret_key: str = "heallock-super-secure-jwt-secret-key-32b"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    encryption_key: str = "heallock-aes-key-32-bytes-long!!"

    # Firebase Authentication (Optional cloud auth)
    firebase_project_id: str = ""
    firebase_credentials_path: str = ""  # Path to service-account.json

    # AI & Clinical LLM APIs
    anthropic_api_key: str = ""  # Claude 3.5 Sonnet for Document AI & Rx Safety
    google_gemini_api_key: str = ""  # Gemini API
    openai_api_key: str = ""  # OpenAI API

    # Cloud Object Storage (For Medical PDFs, DICOM Scans, Lab Images)
    storage_provider: str = "local"  # local | s3 | gcs | r2
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = ""

    # Blockchain Ledger Node (Polygon / Sepolia Testnet RPC via Alchemy / Infura)
    blockchain_rpc_url: str = ""  # e.g. https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
    blockchain_contract_address: str = ""
    blockchain_private_key: str = ""

    # SMS & Emergency Notifications (Twilio / Firebase Cloud Messaging)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""


settings = Settings()
