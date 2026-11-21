# Som de confirmação do voto

Quando o eleitor confirma o voto e o registro é bem-sucedido, o site toca um som.
Você pode escolher qual som será usado sem mexer no código.

## Como trocar o som

1. Escolha um arquivo de áudio pequeno (`.mp4`, `.m4a`, `.mp3` ou `.wav`).
2. Coloque-o nesta pasta com um destes nomes:

| Nome do arquivo | Prioridade | Observação |
|---|---|---|
| `confirm.mp4` | 1º | Som atual enviado pelo administrador |
| `confirm.m4a` | 2º | Áudio AAC em container MP4 |
| `confirm.mp3` | 3º | Use se preferir MP3 |
| `confirm.wav` | 4º | Sino curto padrão do projeto |

3. Faça commit e push para a branch `main` — o GitHub Pages publica automaticamente.

O primeiro arquivo da tabela que existir é usado. Para voltar ao sino padrão, crie um `confirm.wav` (o original está no histórico do Git) e apague os demais.

> O `confirm.mp4` atual tem também uma faixa de vídeo. O navegador toca apenas o áudio, mas se quiser um arquivo só de som, exporte o áudio do seu gravador como `.m4a` ou `.mp3` e substitua o arquivo.

## Dicas

- Use um arquivo curto (1 a 3 segundos) e de volume moderado.
- O navegador toca o som logo após o clique em **Confirmar voto**. Se o som não tocar, verifique se o arquivo está com o nome exatamente como na tabela acima e se o site foi recarregado (`Ctrl+F5`).
- A ausência do arquivo não impede o voto: o registro acontece normalmente, apenas sem áudio.
- O som é tocado **somente** quando o voto é registrado com sucesso — erros (e-mail repetido, votação bloqueada etc.) não tocam som.
