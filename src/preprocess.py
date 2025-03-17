import json
import pandas as pd
import re
import chardet


def clean_text(text):
    # Remove all tags
    text = re.sub(r'<.*?>', '', text)
    # Remove page numbers in the format [Page 32] and manual annotations
    text = re.sub(r'\[.*?\]', '', text, flags=re.DOTALL)
    # Fix extra spaces
    text = re.sub(r'\s+', ' ', text)         # Replace multiple spaces with single space
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)  # Remove space before punctuation
    text = re.sub(r'^\s+|\s+$', '', text)    # Remove leading/trailing spaces
    
    return text


def align_paragraphs(source_paragraphs, translator_paragraphs, concordance_df, translator):

    aligned_paragraphs = []

    source_id_batch = []
    translator_id_batch = []

    source_para_batch = []
    translator_para_batch = []

    for i, row in concordance_df.iterrows():
        source_para_id = row['fontenelle'] 
        translator_para_id = row[translator]

        if pd.notna(source_para_id) and pd.notna(translator_para_id):
            if i > 0:
                # Append concatenated batches to the aligned paragraphs
                aligned_paragraphs.append({
                    'source_ids': ', '.join(source_id_batch),
                    'target_ids': ', '.join(translator_id_batch),
                    'source_fr': ' '.join(source_para_batch),
                    'target_en_untagged': ' '.join(translator_para_batch),
                })
                # Reset the batches
                source_para_batch = []
                translator_para_batch = []
                source_id_batch = []
                translator_id_batch = []

            # Add current paragraphs to batches
            source_para_batch.append(source_paragraphs[int(source_para_id[1:]) - 1])
            translator_para_batch.append(translator_paragraphs[int(translator_para_id[1:]) - 1])

            source_id_batch.append(source_para_id)
            translator_id_batch.append(translator_para_id)

        elif pd.notna(source_para_id):
            source_para_batch.append(source_paragraphs[int(source_para_id[1:]) - 1])
            source_id_batch.append(source_para_id)

        elif pd.notna(translator_para_id):
            translator_para_batch.append(translator_paragraphs[int(translator_para_id[1:]) - 1])
            translator_id_batch.append(translator_para_id)

    # Append any remaining paragraphs
    if source_para_batch or translator_para_batch:
        aligned_paragraphs.append({
            'source_ids': ', '.join(source_id_batch),
            'target_ids': ', '.join(translator_id_batch),
            'source_fr': ' '.join(source_para_batch),
            'target_en_untagged': ' '.join(translator_para_batch)
        })

    return aligned_paragraphs


concordance_df = pd.read_csv('data/raw/concordance.csv')

with open('data/raw/fontenelle_tagged.txt', 'rb') as file:
    raw_source_text = file.read()
    result = chardet.detect(raw_source_text)
    encoding = result['encoding']

with open(f'data/raw/fontenelle_tagged.txt', 'r', encoding=encoding) as file:
    raw_source_text = file.read()

source_paragraphs = []
paragraph_pattern = re.compile(r'<(P\d+)>(.*?)</\1>', re.DOTALL)

for match in paragraph_pattern.finditer(raw_source_text):
    para_text = clean_text(match.group(2))
    source_paragraphs.append(para_text)

translators = [
    'behn', 
    'domvill', 
    'glanville'
]

# Process each translator
for translator in translators:
    with open(f'data/raw/{translator}_tagged.txt', 'rb') as file:
        raw_translator_text = file.read()
        result = chardet.detect(raw_translator_text)
        encoding = result['encoding']

    with open(f'data/raw/{translator}_tagged.txt', 'r', encoding=encoding) as file:
        raw_translator_text = file.read()

    translator_paragraphs = []
    for match in paragraph_pattern.finditer(raw_translator_text):
        para_id = match.group(1)
        para_text = clean_text(match.group(2))
        translator_paragraphs.append(para_text)

    # Call the function to process the alignment
    aligned_paragraphs = align_paragraphs(source_paragraphs, translator_paragraphs, concordance_df, translator)

    # Save the output
    output_data = {'paragraphs': aligned_paragraphs}
    with open(f'data/processed/{translator}_aligned.json', 'w', encoding='utf-8') as file:
        json.dump(output_data, file, ensure_ascii=False, indent=2)

    print(f'Created aligned data for {translator} with {len(aligned_paragraphs)} paragraph pairs')