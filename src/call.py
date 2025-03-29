import os
import json
import logging
import argparse
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


def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Process translations with specific translator and tag")
    parser.add_argument("--translator", required=True, choices=["behn", "knight", "glanvill"], 
                        help="Translator to process (behn, knight, or glanville)")
    parser.add_argument("--tag", required=True, choices=["SC", "LS", "RW", "UP", "NCE", "IIM"], 
                        help="Tag to process (SC, LS, RW, UP, NCE, or IIM)")
    parser.add_argument("--test", action="store_true", help="Run in test mode with only 2 chunks")
    args = parser.parse_args()

    # Load environment variables
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

    # Set API key for Anthropic
    global client
    client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    if not client.api_key:
        raise ValueError('API key not found. Please check your .env file.')

    # Read the user prompt template
    with open(f'prompts/user_prompt.txt') as file:
        user_prompt_template = file.read()

    # Read the system prompt for the specified tag
    with open(f'prompts/system_prompt_{args.tag}.txt', 'r') as file:
        system_prompt = file.read()

    # Read the processed data for the specified translator
    with open(f'app/data/processed/{args.translator}_aligned.json', 'r') as file:
        data = json.load(file)

    results = []

    # Process chunks
    if args.test:
        # For testing, use only two specific chunks
        chunks = [data['chunks'][5], data['chunks'][47]]
        print(f"Running in test mode with 2 chunks")
    else:
        # Process all chunks
        chunks = data['chunks']

    for chunk in tqdm(chunks, desc=f"Processing {args.translator} with tag {args.tag}", unit="chunk"):
        # Replace placeholders in the user prompt
        user_prompt = user_prompt_template.replace('{SOURCE_FR}', untag(chunk['source_manual']))\
                                          .replace('{TARGET_EN_UNTAGGED}', untag(chunk['target_manual']))

        response = completion_with_backoff(
            model='claude-3-7-sonnet-latest',
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    'role': 'user', 
                    'content': user_prompt
                }
            ]
        )

        # Extract the response content
        response_content = response.content[0].text

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
    with open(f'app/data/results/{args.translator}_{args.tag}.json', 'w') as file:
        json.dump({'chunks': results}, file, indent=2)

    # Print a message indicating the results were saved
    print(f"✅ Saved results for {args.translator} with tag <{args.tag}>")


if __name__ == "__main__":
    main()