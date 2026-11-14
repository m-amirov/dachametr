# OpenDesign × Codex — текущий статус

Дата: 2026-11-14. Проверка выполнена из PR #8 worktree на Windows.

| Слой | Статус | Доказательство |
| --- | --- | --- |
| Проектный skill в Git | PASS | `.agents/skills/open-design-project/SKILL.md` присутствует на `90bb578`. |
| `codex` CLI | PASS | `codex-cli 0.167.2`; официальный install guide требует `0.144.6+`. |
| Официальный Codex plugin | PASS | `open-design@open-design`, версия `0.5.3`, установлен штатным `scripts/setup-open-design-codex.ps1 -InstallPlugin`. |
| Marketplace | PASS | `nexu-io/open-design-agent-plugins`, `main` на момент проверки: `c0710761302c69bded82e205362effcce6fde49e`. |
| OpenDesign приложение | NOT FOUND | Подписанное приложение не обнаружено в стандартных путях и команда `od` отсутствует. |
| Local MCP `open-design` | UNAVAILABLE | `codex mcp get open-design --json` вернул `No MCP server named 'open-design' found.` |
| Фактический MCP call / новая Codex-сессия | BLOCKED | Нельзя подтвердить без установленного приложения и регистрации stdio MCP. |
| OpenDesign Cloud / платная генерация | NOT RUN | Проект не передавался во внешний сервис; кредиты не использовались. |
| Local Codex/BYOK выбор | NOT SELECTED | Отдельный выбор режима владельцем не требовался для локальных HTML/CSS-концепций. |

## Что требуется от владельца для полного подключения

1. Установить только подписанное приложение с [официальной страницы OpenDesign](https://open-design.ai/download/) и подтвердить Windows installer prompt.
2. В OpenDesign выбрать Settings → MCP server (или выполнить `od mcp install codex` из активной подписанной установки).
3. Открыть новую Codex-сессию и повторить `codex mcp get open-design --json`; ожидается stdio MCP с абсолютной командой OpenDesign.

До этого проектный skill и Codex plugin не следует выдавать за установленное приложение или доступный MCP.
