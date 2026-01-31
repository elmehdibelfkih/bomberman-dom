.PHONY: start stop install restart status logs

# runtime files
RUN_DIR := run
PID_FILE := $(RUN_DIR)/server.pid
LOG_FILE := $(RUN_DIR)/server.log

start: install
	@mkdir -p $(RUN_DIR)
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Server already running (pid=$$(cat $(PID_FILE)))"; \
	else \
		echo "Starting server..."; \
		cd server && nohup node index.js >> ../$(LOG_FILE) 2>&1 & echo $$! > ../$(PID_FILE); \
		echo "Server started, pid=$$(cat ../$(PID_FILE))"; \
	fi

install:
	@echo "Installing server dependencies..."
	@cd server && npm install

stop:
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "Stopping server (pid=$$PID)"; \
			kill $$PID || true; \
			sleep 0.5; \
			if kill -0 $$PID 2>/dev/null; then kill -9 $$PID || true; fi; \
		else \
			echo "Stale pid file, removing"; \
		fi; \
		rm -f $(PID_FILE); \
	else \
		echo "No pid file found, attempting to pkill"; \
		pkill -f "node.*index.js" || true; \
	fi

restart: stop start

status:
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "Server running (pid=$$PID)"; \
		else \
			echo "Pid file exists but process not running"; \
		fi; \
	else \
		echo "Server not running"; \
	fi

logs:
	@mkdir -p $(RUN_DIR)
	@tail -n 200 -f $(LOG_FILE)
