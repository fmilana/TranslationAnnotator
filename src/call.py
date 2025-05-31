import os
import json
import logging
import argparse
from preprocess import untag
from dotenv import load_dotenv
from anthropic import Anthropic
from openai import OpenAI
from google import genai
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)
from tqdm import tqdm

# Define a function to retry with exponential backoff
@retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(6))
def completion_with_backoff(**kwargs):
    global client, selected_model
    if 'claude' in selected_model:
        return client.messages.create(**kwargs)  # Anthropic
    elif 'gpt' in selected_model:
        return client.chat.completions.create(**kwargs)  # OpenAI
    elif 'gemini' in selected_model:
        return client.models.generate_content(**kwargs)  # Google Gemini
    else:
        raise ValueError(f'Unsupported model: {selected_model}')

def main():
    global client, selected_model

    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Process translations with specific translator and tag')
    parser.add_argument('--translator', required=True, choices=['behn', 'knight', 'glanvill'],
                        help='Translator to process (behn, knight, or glanvill)')
    parser.add_argument('--tag', required=True, choices=['SC', 'LS', 'RW', 'UP', 'NCE', 'IIM'],
                        help='Tag to process (SC, LS, RW, UP, NCE, or IIM)')
    parser.add_argument('--model', required=True, choices=['claude', 'gpt', 'gemini'],
                        help='Model to use (claude, gpt or gemini)')
    parser.add_argument('--test', action='store_true', help='Run in test mode with only 2 chunks')
    args = parser.parse_args()

    selected_model = args.model

    # Load environment variables
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

    if 'claude' in selected_model:
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError('"ANTHROPIC_API_KEY" not found. Please check your .env file.')
        client = Anthropic(api_key=api_key)

    elif 'gpt' in selected_model:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError('"OPENAI_API_KEY" not found. Please check your .env file.')
        client = OpenAI(api_key=api_key)

    elif 'gemini' in selected_model:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError('"GEMINI_API_KEY" not found. Please check your .env file.')
        client = genai.Client(api_key=api_key)

    else:
        raise ValueError(f'Unsupported model: {selected_model}')

    # Load prompts
    with open(f'prompts/user_prompt.txt', encoding='utf-8') as file:
        user_prompt_template = file.read()

    with open(f'prompts/system_prompt_{args.tag}.txt', 'r', encoding='utf-8') as file:
        system_prompt = file.read()

    with open(f'app/data/processed/{args.translator}_aligned.json', 'r', encoding='utf-8') as file:
        data = json.load(file)

    results = []

    chunks = [data['chunks'][5], data['chunks'][47]] if args.test else data['chunks']

    if args.test:
        print(f'Running in test mode with 2 chunks')

    for chunk in tqdm(chunks, desc=f'Processing {args.translator} with tag {args.tag}', unit='chunk'):
        user_prompt = user_prompt_template.replace('{SOURCE_FR}', untag(chunk['source_manual']))\
                                          .replace('{TARGET_EN_UNTAGGED}', untag(chunk['target_manual']))

        if 'claude' in selected_model:
            response = completion_with_backoff(
                model='claude-3-7-sonnet-latest',
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {'role': 'user', 'content': user_prompt}
                ]
            )
            response_content = response.content[0].text

        elif 'gpt' in selected_model:
            response = completion_with_backoff(
                model='gpt-4.1-2025-04-14',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ]
            )
            response_content = response.choices[0].message.content

        elif 'gemini' in selected_model:
            response = completion_with_backoff(
                model='gemini-2.5-pro-preview-05-06',
                contents='\n\n'.join([system_prompt, user_prompt])
            )
            response_content = response.text

        source_segments = target_segments = explanations = ''

        # Try parsing JSON response
        try:
            if not response_content:
                raise ValueError("Empty or None response_content")

            response_content = response_content.removeprefix('```json\n').removesuffix('```')
            response_json = json.loads(response_content)
            source_segments = response_json.get('source_segments', '')
            target_segments = response_json.get('target_segments', '')
            explanations = response_json.get('explanations', '')

        except (json.JSONDecodeError, ValueError, AttributeError) as e:
            print(f'Error parsing JSON for chunk {chunk["chunk_id"]}: {e}')
            try:
                if response_content:
                    escaped_content = response_content.replace('"', '\\"')
                    response_json = json.loads(escaped_content)
                    source_segments = response_json.get('source_segments', '')
                    target_segments = response_json.get('target_segments', '')
                    explanations = response_json.get('explanations', '')
            except Exception as e2:
                print(f"Failed to parse JSON even after escaping for chunk {chunk['chunk_id']}.")
                print(f"Error: {e2}")
                print(f"Response content: {response_content}")

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

    os.makedirs(f'app/data/results/{selected_model}', exist_ok=True)

    with open(f'app/data/results/{selected_model}/{args.translator}_{args.tag}.json', 'w', encoding='utf-8') as file:
        json.dump({'chunks': results}, file, indent=2)

    print(f"✅ Saved results for {args.translator} with tag <{args.tag}>")

if __name__ == '__main__':
    main()
