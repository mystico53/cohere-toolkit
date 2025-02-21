# community/tools/utils/database.py
import sqlite3
from pathlib import Path


def init_database():
    """Initialize the database with required tables."""
    # Get the path to community folder and create a data directory
    data_dir = Path(__file__).parent.parent.parent / "data"
    data_dir.mkdir(exist_ok=True)

    db_path = data_dir / "people.db"

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create a simple people table with name and their info
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS people (
            name TEXT PRIMARY KEY,
            info TEXT NOT NULL
        )
    """)

    # Add some test data
    test_data = [
        (
            "John",
            "John is a senior software engineer with 8 years of experience specializing in Python backend development. He currently leads the API team at a financial technology startup, where he architects scalable microservices and mentors junior developers. He has contributed to several open-source projects in the Django ecosystem and frequently speaks at local Python meetups. Outside of work, he maintains a technical blog focused on system design patterns and teaches coding through online tutorials.",
        ),
        (
            "Alice",
            "Alice is a lead data scientist with a PhD in Applied Mathematics from MIT. She specializes in developing machine learning models for computer vision applications, focusing on medical imaging. She leads a research team at a biotech company developing AI algorithms for early disease detection. Alice has published several papers in top ML conferences, holds three patents in AI-assisted medical diagnostics, and runs a mentorship program for aspiring female data scientists.",
        ),
    ]

    cursor.executemany(
        "INSERT OR REPLACE INTO people (name, info) VALUES (?, ?)", test_data
    )

    conn.commit()
    conn.close()

    return str(db_path)


def get_db_connection(db_path):
    return sqlite3.connect(db_path)
