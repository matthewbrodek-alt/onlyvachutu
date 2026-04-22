{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.python311Packages.virtualenv
    pkgs.nodejs_20
    pkgs.nodePackages.firebase-tools
    pkgs.psmisc   # fuser — для освобождения порта
    pkgs.lsof
    pkgs.htop
  ];

  env = {
    PORT             = "5005";
    PYTHONUNBUFFERED = "1";
    # Admin SDK подхватит ключ автоматически
    GOOGLE_APPLICATION_CREDENTIALS = "backend/serviceAccountKey.json";
  };

  idx = {
    extensions = [
      "ms-python.python"
      "ms-python.vscode-pylance"
      "ms-python.debugpy"
      "toba.vsfire"
    ];

    workspace = {
      onCreate = {
        # Создаём venv и устанавливаем зависимости один раз
        create-venv = "python3 -m venv .venv";
        install-python-deps = ''
          ./.venv/bin/pip install --upgrade pip && \
          ./.venv/bin/pip install \
            flask \
            flask-cors \
            requests \
            python-dotenv \
            firebase-admin \
            google-cloud-firestore \
            gunicorn
        '';
        default.openFiles = [
          "backend/bridge.py"
          "docs/index.html"
        ];
      };

      onStart = {
        # При каждом старте workspace тихо доустанавливаем зависимости.
        # НЕ запускаем сервер здесь — это делает previews ниже.
        # Запуск в onStart И в previews одновременно = два процесса на порту.
        check-python-deps = ''
          ./.venv/bin/pip install -q \
            flask flask-cors requests python-dotenv \
            firebase-admin google-cloud-firestore gunicorn
        '';
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          # Используем gunicorn вместо python bridge.py:
          # - Один master-процесс, один worker
          # - Нет Flask reloader (который форкал второй процесс)
          # - Studio видит стабильный старт без перезапусков
          command = [
            "./.venv/bin/gunicorn"
            "bridge:app"
            "--workers" "1"
            "--threads" "4"
            "--timeout" "120"
            "--bind" "0.0.0.0:5005"
            "--chdir" "backend"
            "--log-level" "info"
            "--access-logfile" "-"
          ];
          manager = "web";
          env = {
            PORT = "5005";
          };
        };
      };
    };
  };
}
