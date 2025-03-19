import os
import json
import logging
from preprocess import untag
from dotenv import load_dotenv
from openai import OpenAI
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)  # for exponential backoff
from tqdm import tqdm


# Set up logging
# logging.basicConfig(level=logging.INFO)


# Define a function to retry with exponential backoff
@retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(6))
def completion_with_backoff(**kwargs):
    return client.chat.completions.create(**kwargs)


# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Set API key for OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
if not client.api_key:
    raise ValueError('API key not found. Please check your .env file.')

# Check available models
# print(client.models.list())
# exit()

# Read the system prompt from file
with open('prompts/system_prompt.txt', 'r') as file:
    system_prompt_template = file.read()

# Define tags
tags = {
    # 'SC': 'Omitted Text',
    'LS': 'Simplification',
    # 'RW': 'Explicitation',
    # 'UP': 'Added Text',
    # 'NCE': 'Domestication',
    # 'IIM': 'Mistaken Translation'
}

# Define translators
translators = [
    'behn', 
    # 'domvill', 
    # 'glanville'
]

# Iterate over tags and translators
for tag in tags:
    system_prompt = system_prompt_template.replace('{TAG}', tag).replace('{TAG_NAME}', tags[tag])

    # Read the user prompt template
    with open(f'prompts/{tag}/user_prompt.txt') as file:
        user_prompt_template = file.read()

    for translator in translators:
        # Read the processed data for the translator
        with open(f'data/processed/{translator}_aligned.json', 'r') as file:
            data = json.load(file)

        results = []

        # Process each paragraph
        # paragraphs = data['paragraphs']
        paragraphs = [data['paragraphs'][5], data['paragraphs'][47]]  # For testing, use only the two paragraphs

        for paragraph in tqdm(paragraphs, desc=f"Processing {translator}", unit="paragraph"):
            # Replace placeholders in the user prompt
            user_prompt = user_prompt_template.replace('{SOURCE_FR}', untag(paragraph['source_fr_manual']))\
                                            .replace('{TARGET_EN_UNTAGGED}', untag(paragraph['target_en_manual']))

            # dump system and user prompts to file to check
            # with open(f"data/results/{translator}_{tag}_system_prompt.txt", "w", encoding="utf-8") as file:
            #     file.write(system_prompt)
            # with open(f"data/results/{translator}_{tag}_user_prompt.txt", "w", encoding="utf-8") as file:
            #     file.write(user_prompt)
            # exit()

            response = completion_with_backoff(
                model='gpt-4o', 
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ]
            )

            # Extract the response content
            response_content = response.choices[0].message.content

            # dump response_content to file
            # with open(f"data/results/{translator}_{tag}_response_content.txt", "w", encoding="utf-8") as file:
            #     file.write(response_content)

            response_content = response_content[7:-3] # remove the first 7 and last 3 characters

            try:
                # Try parsing the response content as JSON
                response_json = json.loads(response_content)
                target_en_ai = response_json.get('target_en_ai', '')
                explanation = response_json.get('explanation', '')
            except json.JSONDecodeError:
                # If not a valid JSON, print the raw response content
                print(f'Error parsing JSON for paragraph {paragraph["source_fr"]}: {response_content}')
                target_en_ai = explanation = ''  # Set as empty if JSON parsing fails

            # Append the result for this paragraph
            results.append({
                'chunk_id': paragraph['chunk_id'],
                'source_ids': paragraph['source_ids'],
                'target_ids': paragraph['target_ids'],
                'source_fr_manual': paragraph['source_fr_manual'],
                # 'source_fr_ai': paragraph['source_fr_ai'],
                'target_en_manual': paragraph['target_en_manual'],
                'target_en_ai': target_en_ai,
                'explanation': explanation
            })

        # Save results to file
        with open(f'data/results/{translator}_{tag}_results.json', 'w') as file:
            json.dump({'paragraphs': results}, file, indent=2)

        # Print a message indicating the results were saved
        print(f"✅ Saved results for {translator} with tag <{tag}>")


# to-do: check for multi-threading or parallel processing