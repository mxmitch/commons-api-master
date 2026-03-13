-- =====================================
-- Drop existing tables if they exist
-- =====================================
DROP TABLE IF EXISTS user_categories;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- =====================================
-- Users table
-- =====================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone_number TEXT,
    postal_code TEXT,
    email_notification BOOLEAN DEFAULT FALSE,
    sms_notification BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- Categories table
-- =====================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- User_Categories join table (many-to-many)
-- =====================================
CREATE TABLE user_categories (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, category_id)
);

-- =====================================
-- Bills table
-- =====================================
CREATE TABLE bills (
    bill_number TEXT PRIMARY KEY,
    long_title_en TEXT NOT NULL,
    long_title_fr TEXT NOT NULL,
    passed_house_first_reading_date TIMESTAMP,
    passed_house_second_reading_date TIMESTAMP,
    passed_house_third_reading_date TIMESTAMP,
    passed_senate_first_reading_date TIMESTAMP,
    passed_senate_second_reading_date TIMESTAMP,
    passed_senate_third_reading_date TIMESTAMP,
    received_royal_assent_date TIMESTAMP,
    parl_session_code TEXT,
    parl_session_en TEXT,
    parl_session_fr TEXT,
    sponsor_en TEXT,
    sponsor_fr TEXT,
    latest_event_en TEXT,
    latest_event_fr TEXT,
    short_summary_en TEXT,
    short_summary_fr TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- Events table
-- =====================================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    bill_id TEXT REFERENCES bills(bill_number) ON DELETE CASCADE,
    title TEXT NOT NULL,
    publication_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bill_id, title, publication_date)
);