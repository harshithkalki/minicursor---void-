import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export default client;