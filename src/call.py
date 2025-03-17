import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)  # for exponential backoff
import logging


# Set up logging
logging.basicConfig(level=logging.INFO)

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

# Read the system prompt from file
with open('prompts/system_prompt.txt', 'r') as file:
    system_prompt_template = file.read()

# Define tags
tags = {
    'LS': 'Simplification',
    # Add more tags as needed
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
        for paragraph in data['paragraphs']:
            # Replace placeholders in the user prompt
            user_prompt = user_prompt_template.replace('{SOURCE_IDS}', paragraph['source_fr'])\
                                              .replace('{TARGET_IDS}', paragraph['target_en_untagged'])

            response = completion_with_backoff(
                model='o3-mini', 
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ]
            )

            # Extract the response content
            response_content = response['output_text']

            try:
                # Try parsing the response content as JSON
                response_json = json.loads(response_content)
                target_en_tagged = response_json.get('target_en_tagged', '')
                explanation = response_json.get('explanation', '')
            except json.JSONDecodeError:
                # If not a valid JSON, print the raw response content
                print(f'Error parsing JSON for paragraph {paragraph["source_fr"]}: {response_content}')
                target_en_tagged = explanation = ''  # Set as empty if JSON parsing fails

            # Append the result for this paragraph
            results.append({
                'source_ids': paragraph['source_ids'],
                'target_ids': paragraph['target_ids'],
                'source_fr': paragraph['source_fr'],
                'target_en_untagged': paragraph['target_en_untagged'],
                'target_en_tagged': target_en_tagged,
                'explanation': explanation
            })

        # Save results to file
        with open(f'data/results/{translator}_{tag}_results.json', 'w') as file:
            json.dump({'paragraphs': results}, file, indent=2)

        # Print a message indicating the results were saved
        print(f'Saved results for {translator} with tag <{tag}>')
