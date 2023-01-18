const {
  many,
  choice,
  anyChar
} = require("arcsecond");
const _ = require('lodash');
const {
  indentString,
  outdentString,
  get
} = require('./utils');

const inlineTag  = require('./inline-tag');
const paramsTag  = require('./params-tag');
const headersTag = require('./headers-tag');
const {
  bodyJsonTag,
  bodyGraphqlTag,
  bodyTextTag,
  bodyXmlTag,
  bodyFormUrlEncodedTag,
  bodyMultipartFormTag
} = require('./body-tag');

const bruToJson = (fileContents) => {
  const parser = many(choice([
    inlineTag,
    paramsTag,
    headersTag,
    bodyJsonTag,
    bodyGraphqlTag,
    bodyTextTag,
    bodyXmlTag,
    bodyFormUrlEncodedTag,
    bodyMultipartFormTag,
    anyChar
  ]));

  const parsed = parser
    .run(fileContents)
    .result
    .reduce((acc, item) => _.merge(acc, item), {});

  const json = {
    type: parsed.type || '',
    name: parsed.name || '',
    request: {
      method: parsed.method || '',
      url: parsed.url || '',
      params: parsed.params || [],
      headers: parsed.headers || [],
      body: parsed.body || {mode: 'none'}
    }
  };

  const body = get(json, 'request.body');

  if(body && body.text) {
    body.text = outdentString(body.text);
  }

  if(body && body.json) {
    body.json = outdentString(body.json);
  }

  if(body && body.xml) {
    body.xml = outdentString(body.xml);
  }

  if(body && body.graphql && body.graphql.query) {
    body.graphql.query = outdentString(body.graphql.query);
  }

  return json;
};

const jsonToBru = (json) => {
  const {
    type,
    name,
    request: {
      method,
      url,
      params,
      headers,
      body
    }
  } = json;

  let bru = `name ${name}
method ${method}
url ${url}
type ${type}
body-mode ${body ? body.mode : 'none'}
`;

  if(params && params.length) {
    bru += `
params
${params.map(param => `  ${param.enabled ? 1 : 0} ${param.name} ${param.value}`).join('\n')}
/params
`;
  }

  if(headers && headers.length) {
    bru += `
headers
${headers.map(header => `  ${header.enabled ? 1 : 0} ${header.name} ${header.value}`).join('\n')}
/headers
`;
  }

  if(body && body.json && body.json.length) {
    bru += `
body(type=json)
${indentString(body.json)}
/body
`;
  }

  if(body && body.graphql && body.graphql.query) {
    bru += `
body(type=graphql)
${indentString(body.graphql.query)}
/body
`;
  }

  if(body && body.text && body.text.length) {
    bru += `
body(type=text)
${indentString(body.text)}
/body
`;
  }

  if(body && body.xml && body.xml.length) {
    bru += `
body(type=xml)
${indentString(body.xml)}
/body
`;
  }

  if(body && body.formUrlEncoded && body.formUrlEncoded.length) {
    bru += `
body(type=form-url-encoded)
${body.formUrlEncoded.map(item => `  ${item.enabled ? 1 : 0} ${item.name} ${item.value}`).join('\n')}
/body
`;
  }

  if(body && body.multipartForm && body.multipartForm.length) {
    bru += `
body(type=multipart-form)
${body.multipartForm.map(item => `  ${item.enabled ? 1 : 0} ${item.name} ${item.value}`).join('\n')}
/body
`;
  }

  return bru;
};

// env
const envVarsTag = require('./env-vars-tag');

const bruToEnvJson = (fileContents) => {
  const parser = many(choice([
    envVarsTag,
    anyChar
  ]));

  const parsed = parser
    .run(fileContents)
    .result
    .reduce((acc, item) => _.merge(acc, item), {});

  const json = {
    variables: parsed.variables || []
  };

  return json;
};

const envJsonToBru = (json) => {
  const {
    variables
  } = json;

  let bru = '';

  if(variables && variables.length) {
    bru += `vars
${variables.map(item => `  ${item.enabled ? 1 : 0} ${item.name} ${item.value}`).join('\n')}
/vars
`;
  }

  return bru;
};

module.exports = {
  bruToJson,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru
};