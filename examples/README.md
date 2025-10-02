# Example Applications

⚠️ **IMPORTANT**: These examples require a local web server to run properly.

## Why?

ES6 modules (`type="module"`) require HTTP(S) protocol. Opening files directly (`file://`) will fail with CORS errors.

## Quick Start

```bash
# Start server
./start-server.sh

# Or manually
python3 -m http.server 8000

# Then open
open http://localhost:8000/examples/rl-ball-catch-pure.html
```

## Examples

| File | Description |
|------|-------------|
| `rl-ball-catch-pure.html` | Ball catching with physics-based control |
| `grid-world-minimal.html` | Simple grid navigation |
| `magnet-circle-training.html` | Circle following task |
| `magnet-slalom-control.html` | Slalom navigation |
| `magnet-multitask-learning.html` | Multiple task learning |
| `mountain-car.html` | Classic mountain car problem |
| `federated-llm-learning.html` | Federated learning demo |

All examples use components from `/components/` directory.
