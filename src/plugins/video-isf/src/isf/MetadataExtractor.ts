/* globals json_parse */

// @ts-ignore
import jsonParse from './json_parse';

const METADATA_ERROR_PREFIX = 'Something is wrong with your ISF metadata';

export default function MetadataExtractor(rawFragmentShader: string) {
  // First pull out the comment JSON to get the metadata.
  // This regex (should) match quotes in the form /* */.
  const regex = /\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/;
  const results = regex.exec(rawFragmentShader);

  if (!results) {
    throw new Error('There is no metadata here.');
  }

  let metadataString = results[0];
  metadataString = metadataString.substring(1, metadataString.length - 1);
  let metadata;
  try {
    metadata = jsonParse(metadataString);
  } catch (e) {
    const loc = e.at;
    const message = (e.message || 'Invalid JSON');
    if (loc) {
      const lines = (metadataString || '')
        .substring(0, loc)
        .split(/\r\n|\r|\n/);
      const lineNumber = lines.length;
      const position = lines[lineNumber - 1].length;
      const errorText = `${METADATA_ERROR_PREFIX}: ${message}\
        at line ${lineNumber} and position ${position}`;
      const enrichedError = new Error(errorText);
      // @ts-ignore
      enrichedError.lineNumber = lineNumber;
      
      // @ts-ignore
      enrichedError.position = position;
      throw enrichedError;
    }
    throw new Error(`${METADATA_ERROR_PREFIX}: ${message}`);
  }

  const startIndex = rawFragmentShader.indexOf('/*');
  const endIndex = rawFragmentShader.indexOf('*/');
  return {
    objectValue: metadata,
    stringValue: metadataString,
    startIndex,
    endIndex,
  };
};
