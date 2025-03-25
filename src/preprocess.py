import json
import pandas as pd
import re
import chardet
import xml.etree.ElementTree as ET


def untag(text):
    """Remove all XML tags except for paragraph IDs."""
    text = re.sub(r'<(?!/?P\d{3}>)[^>]+>', '', text)  # Remove all tags except <Pxxx> ones
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)  # Remove space before punctuation
    text = re.sub(r'^\s+|\s+$', '', text)  # Remove leading/trailing spaces
    return text


def clean_text(text):
    """Remove annotations like [Page 32] and fix spaces."""
    text = re.sub(r'\[.*?\]', '', text, flags=re.DOTALL)  # Remove page numbers and annotations
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
    text = re.sub(r'\s+([.,;:!?])', r'\1', text)  # Remove space before punctuation
    text = re.sub(r'^\s+|\s+$', '', text)  # Remove leading/trailing spaces
    return text


def extract_paragraphs(xml_file):
    """Extract paragraphs from an XML file, keeping paragraph IDs and inline XML tags."""
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    def get_text_with_tags(element):
        """Recursively extract text including nested XML tags."""
        text = element.text or ''  # Start with the main text (before any children)
        for child in element:
            text += f'<{child.tag}>{get_text_with_tags(child)}</{child.tag}>'  # Recursively process child elements
            if child.tail:  
                text += child.tail  # Append any text after the child tag
        return text.strip()
    
    paragraphs = []
    for para in root:  # Iterate over paragraph elements (e.g., <P021>)
        para_id = para.tag  # Extract paragraph ID (e.g., P021)
        para_text = get_text_with_tags(para)  # Extract full text, including nested tags
        para_text = clean_text(para_text)  # Apply text cleaning
        
        paragraphs.append(f'<{para_id}>{para_text}</{para_id}>')  # Preserve paragraph ID formatting

    return paragraphs


def align_paragraphs(source_paragraphs, translator_paragraphs, concordance_df, translator):
    """Align paragraphs based on concordance mappings."""
    aligned_chunks = []

    source_id_batch = []
    translator_id_batch = []

    source_para_batch = []
    translator_para_batch = []

    counter = 0

    for i, row in concordance_df.iterrows():
        source_para_id = row['fontenelle']
        translator_para_id = row[translator]

        if pd.notna(source_para_id) and pd.notna(translator_para_id):
            if i > 0:
                aligned_chunks.append({
                    'chunk_id': counter,
                    'source_ids': ', '.join(source_id_batch),
                    'target_ids': ', '.join(translator_id_batch),
                    'source_manual': ' '.join(source_para_batch),
                    'target_manual': ' '.join(translator_para_batch)
                })
                source_para_batch = []
                translator_para_batch = []
                source_id_batch = []
                translator_id_batch = []

                counter += 1

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

    if source_para_batch or translator_para_batch:
        aligned_chunks.append({
            'chunk_id': counter,
            'source_ids': ', '.join(source_id_batch),
            'target_ids': ', '.join(translator_id_batch),
            'source_manual': ' '.join(source_para_batch),
            'target_manual': ' '.join(translator_para_batch)
        })

    return aligned_chunks


if __name__ == '__main__':
    concordance_df = pd.read_csv('app/data/raw/concordance.csv')

    # Extract paragraphs from the source XML
    source_paragraphs = extract_paragraphs('app/data/raw/fontenelle_tagged.xml')

    translators = ['behn', 'domvill', 'glanville']

    for translator in translators:
        translator_paragraphs = extract_paragraphs(f'app/data/raw/{translator}_tagged.xml')

        # Align paragraphs based on the concordance file
        aligned_chunks = align_paragraphs(source_paragraphs, translator_paragraphs, concordance_df, translator)

        # Save the output as JSON
        output_data = {'chunks': aligned_chunks}
        with open(f'app/data/processed/{translator}_aligned.json', 'w', encoding='utf-8') as file:
            json.dump(output_data, file, ensure_ascii=False, indent=2)

        print(f'✅ Created aligned app/data for {translator} with {len(aligned_chunks)} chunk pairs')
