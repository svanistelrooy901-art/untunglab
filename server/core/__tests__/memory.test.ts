import { MemoryStore } from '../memory';
import { describeStore } from './storeContract';

describeStore('MemoryStore', async () => new MemoryStore());
