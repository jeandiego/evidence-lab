# Integração pendente: publicação do dia 2

O artigo não foi localizado em `posts/*/post/` na main atualizada (92c5a85). O post `002-form-abstractions-dx` é sobre abstrações de formulário e não corresponde ao dia 2. Nenhum artigo existente foi alterado.

A referência encontrada foi a seção 2, “Quando a conferência mensal virou semanal”, em `/Users/jeandiego/Dev/fyin/docs/roteiro-publicacoes-fyin.md`. Ela contém versões LinkedIn/X e indicação de vídeo, sem artigo canônico no Lab. Não transformar esse roteiro em um novo artigo sem confirmação editorial.

## Nota editorial pronta

Este texto amplia um pouco o formato dos laboratórios técnicos que venho publicando aqui. No Fyin, a exploração passa também pelos problemas de uso, pelas decisões de produto, pelas interfaces e pelas interações, além da implementação. Este artigo acompanha parte desse processo. Os protótipos representam decisões em exploração e não comprovam que todas as funcionalidades estejam implementadas no app.

## Trecho de integração pronto

Inserir depois do trecho sobre repetir bancos, investimentos, dólar, calculadora e WhatsApp. Patrimônio investido é a demonstração escolhida porque permite percorrer o total, os titulares e as instituições, incluindo a referência de conversão do dólar. É uma escolha editorial para acompanhar a conferência descrita no roteiro.

```html
<p>Uma das partes dessa conferência era reunir o que estava investido em lugares diferentes. Neste protótipo do Fyin, dá para partir do total da casa, filtrar por titular e abrir uma instituição. Os nomes e valores são fictícios; a interação permite examinar uma decisão de interface, sem demonstrar que esse fluxo inteiro já esteja implementado no app.</p>
<figure style="max-width:440px;margin-inline:0">
  <iframe
    src="/demos/fyin/dia-2/patrimonio-investido/index.html"
    title="Protótipo do Fyin: explorar o patrimônio investido por titular e instituição"
    loading="lazy"
    sandbox="allow-scripts allow-same-origin"
    referrerpolicy="no-referrer"
    width="402"
    height="914"
    style="display:block;width:100%;height:auto;aspect-ratio:402/914;border:0"
  ></iframe>
  <figcaption>Protótipo com dados fictícios. Toque em “Patrimônio investido”, filtre por titular e abra uma instituição.</figcaption>
</figure>
<p><a href="/demos/fyin/dia-2/patrimonio-investido/index.html" target="_blank" rel="noreferrer">Abrir demonstração</a> · <a href="/lab/fyin/">Conhecer a exploração completa do Fyin</a></p>
```

O snippet usa HTML aceito pelo conteúdo Markdown existente. Não requer componente, estilos ou scripts de protótipo no documento do artigo. A incorporação foi testada em uma fixture temporária; a validação no artigo definitivo depende de localizar seu arquivo.
