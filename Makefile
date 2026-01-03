.PHONY: start stop install

start: install
	@echo "Starting server..."
	@cd server && npm start

install:
	@echo "Installing dependencies..."
	@cd server && npm install

stop:
	@echo "Stopping server..."
	@pkill -f "node.*index.js" || true
