{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.python311Packages.virtualenv
    pkgs.nodejs_20
    pkgs.nodePackages.firebase-tools
  ];

  env = {
    PORT                            = "5005";
    PYTHONUNBUFFERED                = "1";
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
        create-venv         = "python3 -m venv .venv";
        install-python-deps = ''
          ./.venv/bin/pip install --upgrade pip && \
          ./.venv/bin/pip install \
            flask \
            flask-cors \
            requests \
            python-dotenv \
            firebase-admin \
            google-cloud-firestore
        '';
        default.openFiles = [
          "backend/bridge.py"
          "docs/index.html"
        ];
      };

      onStart = {
        # ТОЛЬКО установка зависимостей — запуск НЕ здесь
        check-python-deps = ''
          ./.venv/bin/pip install -q \
            flask flask-cors requests python-dotenv \
            firebase-admin google-cloud-firestore
        '';
      };
    };

    # Только previews запускает bridge — один раз
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "./.venv/bin/python" "backend/bridge.py" ];
          manager = "web";
          env = {
            PORT = "5005";
          };
        };
      };
    };
  };
}