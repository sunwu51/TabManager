const baseUrl = 'https://api.siliconflow.cn'


const commonHeader = {
    accept: 'application/json',
    'content-type': 'application/json',
}

const chatModel = "Qwen/Qwen2.5-7B-Instruct", embeddingModel = "BAAI/bge-m3";

export async function summarize(secretKey, text, model) {
    if (!model || model.length == 0) {
      model = chatModel;
    }
    const options = {
        method: 'POST',
        headers: {...commonHeader, authorization: 'Bearer ' + secretKey},
        body: JSON.stringify({
          model,
          messages: [
            {role: 'system', content: '你是一个网页内容总结助手，用户会发送网站的内容，你对内容进行总结，概括为简短的几句话返回，除了专有名词或缩写尽可能用中文'},
            {role: 'user', content: "请用中文概述网页，网页内容为：" + text.replace("\n", "").replace("\t", "")}
          ],
        })
      };
      var res = await fetch(`${baseUrl}/v1/chat/completions`, options)
      var json = await res.json();
      return json.choices[0].message.content;
}

export async function embedding(secretKey, input) {
    const options = {
        method: 'POST',
        headers: {...commonHeader, authorization: 'Bearer ' + secretKey},
        body: JSON.stringify({
          model: embeddingModel,
          input,
          encoding_format: 'float'
        })
      };
      var res = await fetch(`${baseUrl}/v1/embeddings`, options)
      var json = await res.json();
      return json.data[0].embedding;
}

export function distance(p1, p2) {
    let sum = 0;
    for (let i = 0; i < p1.length; i++) {
        sum += Math.pow(p1[i] - p2[i], 2);
    }
    return 0.8/Math.sqrt(sum);
}