# Documentação API Gemini

# Instalar o SDK de IA Generativa do Google

## Linguagens disponíveis
- Python  
- JavaScript  
- Go  
- Java  
- C#  
- Apps Script  

---

## Instalação (Node.js v18+)

Usando o Node.js v18 ou superior, instale o SDK da IA Generativa do Google para TypeScript e JavaScript com o comando:

```bash
npm install @google/genai
```

## Faça sua primeira solicitação

Este é um exemplo que usa o método generateContent para enviar uma solicitação à API Gemini utilizando o modelo Gemini 2.5 Flash.

Se você definir sua chave de API como a variável de ambiente GEMINI_API_KEY, ela será capturada automaticamente pelo cliente ao usar as bibliotecas da API Gemini.

Caso contrário, será necessário transmitir a chave de API como argumento ao inicializar o cliente.

Todas as amostras de código na documentação da API Gemini pressupõem que você definiu a variável de ambiente GEMINI_API_KEY.

Exemplo em JavaScript
```javascript
import { GoogleGenAI } from "@google/genai";

// O cliente obtém a API key da variável de ambiente `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Explain how AI works in a few words",
  });

  console.log(response.text);
}

main();
```

<h1>Service Unavailable</h1>

A API Gemini pode gerar texto com base em entradas de texto, imagens, vídeo e áudio.

## Confira um exemplo básico:

### JavaScript
```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "How does AI work?",
  });
  console.log(response.text);
}

await main();
```

### Pensar com o Gemini
Os modelos do Gemini geralmente têm o "pensamento" ativado por padrão, o que permite que o modelo raciocine antes de responder a uma solicitação.

Cada modelo é compatível com diferentes configurações de pensamento, o que dá controle sobre custo, latência e inteligência. Para mais detalhes, consulte o guia de pensamento.

JavaScript
```javascript
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "How does AI work?",
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    }
  });
  console.log(response.text);
}

await main();
```
### Instruções do sistema e outras configurações
É possível orientar o comportamento dos modelos do Gemini com instruções do sistema. Para fazer isso, transmita um objeto GenerateContentConfig.

JavaScript
```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Hello there",
    config: {
      systemInstruction: "You are a cat. Your name is Neko.",
    },
  });
  console.log(response.text);
}

await main();
```

O objeto GenerateContentConfig também permite substituir parâmetros de geração padrão, como temperatura.

Ao usar modelos do Gemini 3, recomendamos manter o temperature no valor padrão de 1,0. Mudar a temperatura (definindo-a abaixo de 1,0) pode levar a um comportamento inesperado, como looping ou desempenho degradado, principalmente em tarefas complexas de matemática ou raciocínio.

JavaScript
```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Explain how AI works",
    config: {
      temperature: 0.1,
    },
  });
  console.log(response.text);
}

await main();
```
Consulte GenerateContentConfig na referência da API para ver uma lista completa de parâmetros configuráveis e as respectivas descrições.

### Entradas multimodais
A API Gemini aceita entradas multimodais, permitindo combinar texto com arquivos de mídia. O exemplo a seguir mostra como fornecer uma imagem:

JavaScript
```javascript
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const image = await ai.files.upload({
    file: "/path/to/organ.png",
  });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      createUserContent([
        "Tell me about this instrument",
        createPartFromUri(image.uri, image.mimeType),
      ]),
    ],
  });
  console.log(response.text);
}

await main();
```
Para conhecer outros métodos de fornecimento de imagens e um processamento mais avançado, consulte nosso guia de compreensão de imagens. A API também é compatível com entradas e compreensão de documentos, vídeos e áudios.

### Respostas de streaming
Por padrão, o modelo retorna uma resposta somente depois que todo o processo de geração é concluído.

Para interações mais fluidas, use o streaming para receber instâncias de GenerateContentResponse de forma incremental à medida que são geradas.

JavaScript
```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: "Explain how AI works",
  });

  for await (const chunk of response) {
    console.log(chunk.text);
  }
}

await main();
```
### Conversas com várias interações (chat)
Nossos SDKs oferecem funcionalidades para coletar várias rodadas de comandos e respostas em uma conversa, facilitando o acompanhamento do histórico de conversas.

Observação: a funcionalidade de chat é implementada apenas como parte dos SDKs. Nos bastidores, ele ainda usa a API generateContent. Para conversas com várias interações, o histórico completo é enviado ao modelo a cada interação de acompanhamento.

JavaScript
```javascript

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ],
  });

  const response1 = await chat.sendMessage({
    message: "I have 2 dogs in my house.",
  });
  console.log("Chat response 1:", response1.text);

  const response2 = await chat.sendMessage({
    message: "How many paws are in my house?",
  });
  console.log("Chat response 2:", response2.text);
}

await main();
```

O streaming também pode ser usado em conversas com várias interações.


JavaScript
```javascript

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ],
  });

  const stream1 = await chat.sendMessageStream({
    message: "I have 2 dogs in my house.",
  });
  for await (const chunk of stream1) {
    console.log(chunk.text);
    console.log("_".repeat(80));
  }

  const stream2 = await chat.sendMessageStream({
    message: "How many paws are in my house?",
  });
  for await (const chunk of stream2) {
    console.log(chunk.text);
    console.log("_".repeat(80));
  }
}

await main();
```

### modelos
gemini-3.1-pro-preview (coisas avançadas)
gemini-3-flash-preview (Bom desempenho por uma fração do custo)
gemini-3.1-flash-lite-preview (modelo muito mais rápido. Perde um pouco em precisão)