# Superpowers (skills del proyecto)

Copia de las skills de [obra/superpowers](https://github.com/obra/superpowers)
**v6.2.0**, instaladas como skills de proyecto para que estén disponibles en
cualquier sesión de Claude Code sobre este repositorio (incluidas las sesiones
remotas de Claude Code en la web, donde los plugins de la cuenta no se cargan).

Licencia MIT, ver `LICENSE`. Autor: Jesse Vincent.

## Skills incluidas

| Skill | Para qué sirve |
| --- | --- |
| `using-superpowers` | Punto de entrada: cómo encontrar y usar el resto de skills |
| `brainstorming` | Convertir una idea en un diseño/spec antes de programar |
| `writing-plans` | Escribir un plan de implementación por pasos |
| `executing-plans` | Ejecutar un plan con checkpoints de revisión |
| `subagent-driven-development` | Ejecutar un plan despachando un subagente por tarea |
| `dispatching-parallel-agents` | Paralelizar tareas independientes |
| `test-driven-development` | Ciclo RED-GREEN-REFACTOR |
| `systematic-debugging` | Depuración por causa raíz antes de proponer arreglos |
| `verification-before-completion` | Verificar con evidencia antes de decir "listo" |
| `requesting-code-review` | Despachar un subagente revisor |
| `receiving-code-review` | Procesar feedback de revisión con rigor técnico |
| `using-git-worktrees` | Aislar el trabajo en un worktree |
| `finishing-a-development-branch` | Cerrar e integrar una rama de desarrollo |
| `writing-skills` | Crear y probar skills nuevas |

## Diferencias respecto al plugin original

1. **Prefijo `superpowers:` eliminado.** Como skills de proyecto no llevan
   prefijo de plugin, las referencias cruzadas del texto original
   (`superpowers:test-driven-development`) se reescribieron a la forma sin
   prefijo (`test-driven-development`), que es el nombre real con el que hay
   que invocarlas.
2. **Hook adaptado.** `../hooks/superpowers-session-start` es una adaptación de
   `hooks/session-start` del plugin: resuelve rutas relativas a `.claude/` en
   vez de `$CLAUDE_PLUGIN_ROOT` (que no existe fuera de un plugin) y emite
   siempre el formato de salida de Claude Code. Se registra en
   `../settings.json` y su único efecto es inyectar el contenido de
   `using-superpowers` al inicio de la sesión. Si no lo quieres, borra el
   bloque `hooks` de `../settings.json`.

## Actualizar

```bash
git clone --depth 1 https://github.com/obra/superpowers.git /tmp/superpowers
rm -rf .claude/skills/*/
cp -a /tmp/superpowers/skills/. .claude/skills/
grep -rl 'superpowers:' .claude/skills | xargs sed -i 's/superpowers://g'
```

Revisa después si `hooks/session-start` cambió upstream, para reflejarlo en
`../hooks/superpowers-session-start`.
