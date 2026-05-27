# FYTEFANS — Ultimate Fighter

Juego de peleas 2D para adultos (+18) desarrollado con Vanilla JavaScript y Canvas API, estilo Mortal Kombat.

## Personajes

| Personaje | Rol | Controles |
|-----------|-----|-----------|
| **Ruki** | Jugador / seleccionable en 1vPC | `A` `D` mover · `W` saltar · `SPACE` atacar · `Q` ultimate |
| **Chun** | Jugador 2 / CPU seleccionable | `←` `→` mover · `↑` saltar · `↓` atacar · `/` ultimate |

## Modos de juego

- **1 VS 1** — dos jugadores en el mismo teclado
- **1 VS PC** — elegís tu personaje (Ruki o Chun) y peleás contra la IA

## Mecánicas

- Sistema de rondas al mejor de 3 (estilo MK)
- Barra de vida y barra de ultimate por personaje
- **Ultimate** — al llenar la barra, activá el poder especial: los personajes desaparecen, aparece la animación `cum.gif` con parpadeo blanco/negro y se quita 1/3 de la vida del enemigo
- Los personajes se chocan físicamente (no se atraviesan) pero se pueden saltar por encima
- Animaciones de victoria (`win.gif`) al ganar una ronda
- Música en loop durante la pelea + sonido de golpe en cada impacto
- IA con comportamiento reactivo: persecución, ataque, retroceso, saltos y uso de ultimate

## Stack técnico

- **Vite** como bundler y servidor de desarrollo
- **Canvas API** para renderizado de sprites y efectos
- **HTML `<img>`** para GIFs animados nativos (fondo, victoria, ultimate)
- **GSAP** para animaciones de barras de vida
- **CSS `transform: scale()`** para escalar el juego al viewport completo

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

## Build para producción

```bash
npm run build
```

Los archivos estáticos quedan en la carpeta `dist/`.
