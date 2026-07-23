import { runPipeline } from './lib/pipeline.js';
import { sampleArtifacts } from './lib/sampleData.js';

const result = runPipeline(sampleArtifacts);

console.log(result.finalPromptContext);
console.log('\n Pipeline Metrics ');
console.log(`Security exclusions (private artifacts blocked): ${result.securityExclusionCount}`);
console.log(`Stale artifacts dropped: ${result.droppedStaleIds.join(', ') || '(none)'}`);
