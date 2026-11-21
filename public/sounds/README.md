# Som de confirmação do voto

Quando o eleitor confirma o voto e o registro é bem-sucedido, o site toca um som.
Você pode escolher qual som será usado sem mexer no código.

## Como trocar o som

1. Escolha um arquivo de áudio pequeno (`.mp3` ou `.wav`).
2. Coloque-o nesta pasta com um destes nomes:

| Nome do arquivo | Prioridade | Observação |
|---|---|---|
| `confirm.mp3` | 1º (preferencial) | Se existir, é usado no lugar do `.wav` |
| `confirm.wav` | 2º | Já vem pronto no projeto (sino curto) |

3. Faça commit e push para a branch `main` — o GitHub Pages publica automaticamente.

Se os dois arquivos existirem, o `confirm.mp3` tem prioridade. Para voltar ao som padrão, apague o `confirm.mp3`.

## Dicas

- Use um arquivo curto (1 a 3 segundos) e de volume moderado.
- O navegador toca o som logo após o clique em **Confirmar voto**. Se o som não tocar, verifique se o arquivo está com o nome exatamente como na tabela acima e se o site foi recarregado (`Ctrl+F5`).
- A ausência do arquivo não impede o voto: o registro acontece normalmente, apenas sem áudio.
- O som é tocado **somente** quando o voto é registrado com sucesso — erros (e-mail repetido, votação bloqueada etc.) não tocam som.
