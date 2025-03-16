import re
import json
import chardet

def extract_pairs(raw_text, translator):
    # Pattern to extract Fontenelle segments
    fontenelle_pattern = r'Fontenelle \((?:\d{4})\)\s+\d+\s+\d+\s+<P\d+>\s+([\s\S]*?)\s+</P\d+>'
    
    # Pattern to extract Domvill segments
    translator_pattern = translator + r' \((?:\d{4})\)\s+\d+\s+\d+\s+<P\d+>\s+([\s\S]*?)\s+</P\d+>'
    
    # Extract all matches
    fontenelle_segments = re.findall(fontenelle_pattern, raw_text, re.DOTALL)
    fontenelle_segments = [clean_text(segment) for segment in fontenelle_segments]

    translator_segments = re.findall(translator_pattern, raw_text, re.DOTALL)
    translator_segments = [clean_text(segment) for segment in translator_segments]
    
    # Create pairs (assuming they're in order)
    pairs = [
        {
            "source_fr": untag(fontenelle_segment),
            "target_en_untagged": untag(translator_segment),
            "target_en_tagged": translator_segment
        }
        for fontenelle_segment, translator_segment in zip(fontenelle_segments, translator_segments)
    ]
    
    return pairs



def clean_text(text):
    # Remove line numbers at beginning of lines
    text = re.sub(r'(?m)^\s*\d+\s+\d+\s+', '', text)
    # Remove line numbers at end of text or lines
    text = re.sub(r'\s+\d+\s+\d+\s*$', '', text)
    text = re.sub(r'\s+\d+\s+\d+\s*(?=\n)', '', text)
    # Remove page markers
    text = re.sub(r'\[Page\s+\d+\]', '', text)
    # Handle square brackets placeholders
    text = re.sub(r'\[\s*\]', '', text)
    text = re.sub(r'\[…\]', '', text)  # Also remove "[…]"
    # Fix extra spaces
    text = re.sub(r'\s+', ' ', text)         # Replace multiple spaces with single space
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)  # Remove space before punctuation
    text = text.strip()                      # Remove leading/trailing spaces
    
    return text


def untag(text):
    # Remove all tags
    text = re.sub(r'<.*?>', '', text)
    # Fix extra spaces
    text = re.sub(r'\s+', ' ', text)         # Replace multiple spaces with single space
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)  # Remove space before punctuation
    text = re.sub(r'^\s+|\s+$', '', text)    # Remove leading/trailing spaces
    return text



translators = ['Behn', 'Domvill', 'Glanvill']
tags = ['IIM', 'LS', 'NCE', 'RW', 'SC', 'UP'] 


for translator in translators:
    for tag in tags:
        # Detect encoding
        with open(f'data/raw/{tag}.txt', 'rb') as f:
            raw_data = f.read()
            result = chardet.detect(raw_data)
            encoding = result['encoding']

        # Process raw file
        with open(f'data/raw/{tag}.txt', 'r', encoding=encoding) as f:
            raw_text = f.read()

        data = extract_pairs(raw_text, translator)

        # Save to JSON
        with open(f'data/processed/{translator.lower()}/{tag}_pairs.json', 'w', encoding='utf-8') as f:
            json.dump({"examples": data}, f, ensure_ascii=False, indent=2)
            print(f"Saved {len(data)} pairs to {translator.lower()}/{tag}_pairs.json")