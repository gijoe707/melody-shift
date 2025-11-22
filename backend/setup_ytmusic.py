"""Setup script for YouTube Music OAuth authentication"""
import os
import json

print("=== Melody Shift - YouTube Music OAuth Setup ===\n")
print("To authenticate with YouTube Music, follow these steps:\n")
print("1. Open YouTube Music in your browser (Firefox or Chrome)")
print("2. Press F12 to open Developer Tools")
print("3. Go to the 'Network' tab")
print("4. Filter by '/browse'")
print("5. Click on one of the requests")
print("6. Find 'Request Headers' section")
print("7. Click 'RAW' to view headers in raw format")
print("8. Right-click and select 'Copy All'")
print("9. Paste the headers below (press Enter twice when done):\n")

print("Paste headers here:")
print("-" * 50)

# Read multiline input
headers_lines = []
while True:
    try:
        line = input()
        if line == "":
            if headers_lines and headers_lines[-1] == "":
                break
        headers_lines.append(line)
    except EOFError:
        break

headers_raw = "\n".join(headers_lines).strip()

if not headers_raw:
    print("\n❌ Error: No headers provided!")
    exit(1)

# Parse headers into a dictionary
headers_dict = {}
for line in headers_raw.split('\n'):
    if ':' in line:
        key, value = line.split(':', 1)
        headers_dict[key.strip()] = value.strip()

# Create the oauth.json file with the required format for ytmusicapi
oauth_data = {
    "headers": headers_dict
}

try:
    with open("oauth.json", "w") as f:
        json.dump(oauth_data, f, indent=2)
    
    print("\n✅ Success! YouTube Music authentication is set up.")
    print("The oauth.json file has been created.")
    print("\nYou can now run the backend server with: python main.py")
    
except Exception as e:
    print(f"\n❌ Error creating oauth.json: {e}")
    print("Please make sure you have write permissions in this directory.")

