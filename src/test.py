import json

with open('data/results/behn_LS_response_content.txt', 'r', encoding='utf-8') as file:
    response_text = file.read()[7:-3]

# Remove potential Markdown formatting
cleaned_text = response_text.lstrip("json").strip()

# Parse the JSON
data = json.loads(cleaned_text)

# dump to new file
with open('data/results/behn_LS_response_content_cleaned.json', 'w', encoding='utf-8') as file:
    json.dump(data, file, ensure_ascii=False, indent=2)

# dump to new file
# with open('data/results/behn_LS_response_content_cleaned.txt', 'w', encoding='utf-8') as file:
#     file.write(cleaned_text)