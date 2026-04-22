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
    PORT = "5005";
    PYTHONUNBUFFERED = "1";
    GOOGLE_APPLICATION_CREDENTIALS = "serviceAccountKey.json";
  };

  idx = {
    extensions = [
      "ms-python.python"
      "ms-python.vscode-pylance"
      "ms-python.debugpy"
      "toba.vsfire"
    ];

    workspace = {
      # Один раз при создании воркспейса
      onCreate = {
        create-venv = "python3 -m venv .venv";
        install-python-deps = ''
          ./.venv/bin/pip install --upgrade pip && \
          ./.venv/bin/pip install \
            flask \
            flask-cors \
            requests \
            python-dotenv \
            firebase-admin \
            functions-framework \
            google-cloud-firestore
        '';
        default.openFiles = [
          "backend/bridge.py"
          "docs/index.html"
        ];
      };

      # При каждом старте воркспейса
      onStart = {
        check-python-deps = ''
          ./.venv/bin/pip install -q \
            flask flask-cors requests python-dotenv \
            firebase-admin functions-framework google-cloud-firestore
        '';
      };
    };

    previews = {
      enable = true;
      previews = {
        # Локальный Flask-мост (Telegram <-> сайт)
        web = {
          command = ["./.venv/bin/python" "backend/bridge.py"];
          manager = "web";
          env = {
            PORT = "5005";
          };
        };
        # Firebase Functions на Python через functions-framework
        functions = {
          command = [
            "./.venv/bin/functions-framework"
            "--source=functions/main.py"
            "--target=bridge"
            "--port=8080"
          ];
          manager = "web";
          env = {
            PORT = "8080";
          };
        };
      };
    };
  };
}
