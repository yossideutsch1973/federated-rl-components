#!/bin/bash

echo "🚀 Starting local server for Federated RL Component Library..."
echo ""
echo "📂 Server running at: http://localhost:8000"
echo ""
echo "🎯 Try these examples:"
echo "   Grid World:    http://localhost:8000/examples/grid-world-minimal.html"
echo "   Mountain Car:  http://localhost:8000/examples/mountain-car.html"
echo ""
echo "⚠️  Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000
