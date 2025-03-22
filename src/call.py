import os
import json
import logging
from preprocess import untag
from dotenv import load_dotenv
# from openai import OpenAI
from anthropic import Anthropic
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
    # return client.chat.completions.create(**kwargs) # openai
    return client.messages.create(**kwargs) # anthropic


# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Set API key for OpenAI
# client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
if not client.api_key:
    raise ValueError('API key not found. Please check your .env file.')

# Check available models
# print(client.models.list())
# exit()

# Read the system prompt from file
# with open('prompts/system_prompt.txt', 'r') as file:
#     system_prompt_template = file.read()

with open(f'prompts/user_prompt.txt') as file:
    user_prompt_template = file.read()

# Define tags
tags = {
    'SC': 'Omitted Text',
    # 'LS': 'Simplification',
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
    with open(f'prompts/system_prompt_{tag}.txt', 'r') as file:
        system_prompt = file.read()

    # system_prompt = system_prompt_template.replace('{TAG}', tag).replace('{TAG_NAME}', tags[tag])

    # Read the user prompt template
    # with open(f'prompts/user_prompt_{tag}.txt') as file:
    #     user_prompt_template = file.read()

    for translator in translators:
        # Read the processed data for the translator
        with open(f'data/processed/{translator}_aligned.json', 'r') as file:
            data = json.load(file)

        results = []

        # Process each chunk
        # chunks = data['chunks']
        chunks = [data['chunks'][5], data['chunks'][47]]  # For testing, use only the two chunks

        for chunk in tqdm(chunks, desc=f"Processing {translator}", unit="chunk"):
            # Replace placeholders in the user prompt
            user_prompt = user_prompt_template.replace('{SOURCE_FR}', untag(chunk['source_manual']))\
                                              .replace('{TARGET_EN_UNTAGGED}', untag(chunk['target_manual']))

            # dump system and user prompts to file to check
            # with open(f"data/results/{translator}_{tag}_system_prompt.txt", "w", encoding="utf-8") as file:
            #     file.write(system_prompt)
            # with open(f"data/results/{translator}_{tag}_user_prompt.txt", "w", encoding="utf-8") as file:
            #     file.write(user_prompt)
            # exit()

            response = completion_with_backoff(
                # model='gpt-4o', # openai
                model='claude-3-7-sonnet-latest', # anthropic
                max_tokens=4096, # anthropic
                system = system_prompt, # anthropic
                messages=[
                    # { # OpenAI
                    #     'role': 'system', 
                    #     'content': system_prompt
                    # },
                    {
                        'role': 'user', 
                        'content': user_prompt
                    }
                ]
            )

            # Extract the response content
            # response_content = response.choices[0].message.content # openai
            response_content = response.content[0].text # anthropic

            # dump response_content to file
            # with open(f"data/results/{translator}_{tag}_response_content.txt", "w", encoding="utf-8") as file:
            #     file.write(response_content)

            try:
                # Attempt to parse the response as JSON
                response_json = json.loads(response_content)
                source_segments = response_json.get('source_segments', '')
                target_segments = response_json.get('target_segments', '')
                explanations = response_json.get('explanations', '')
            except json.JSONDecodeError:
                # If JSON parsing fails, try escaping quotations and parsing again
                print(f'Error parsing JSON for chunk {chunk["chunk_id"]}: Attempting to escape and retry parsing.')
                try:
                    escaped_content = response_content.replace('"', '\\"')  # Escape double quotes
                    response_json = json.loads(escaped_content)  # Attempt parsing again
                    source_segments = response_json.get('source_segments', '')
                    target_segments = response_json.get('target_segments', '')
                    explanations = response_json.get('explanations', '')
                except json.JSONDecodeError:
                    print(f"Failed to parse JSON even after escaping for chunk {chunk['chunk_id']}.")
                    print(f"Response content: {response_content}")
                    source_segments = target_segments = explanations = ''  # Set empty if it still fails

            # Append the result for this chunk
            results.append({
                'chunk_id': chunk['chunk_id'],
                'source_ids': chunk['source_ids'],
                'target_ids': chunk['target_ids'],
                'source_manual': chunk['source_manual'],
                'target_manual': chunk['target_manual'],
                'source_segments': source_segments,
                'target_segments': target_segments,
                'explanations': explanations
            })

        # Save results to file
        with open(f'data/results/{translator}_{tag}.json', 'w') as file:
            json.dump({'chunks': results}, file, indent=2)

        # Print a message indicating the results were saved
        print(f"✅ Saved results for {translator} with tag <{tag}>")


# to-do: check for multi-threading or parallel processing