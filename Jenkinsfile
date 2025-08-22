pipeline {
    agent any

    environment {
        PROJECT_DIR = '/var/www/node/wyze-care-backend'
        PM2_ID = '17'
        PATH = "/var/www/node/wyze-care-backend/node_modules/.bin:${env.PATH}"

    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Pull Changes') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'git pull origin main'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                dir(PROJECT_DIR) {
                   sh '''
                set -e
                echo "🗑️  Removing node_modules..."
                rm -rf node_modules

                echo "📦 Installing dependencies with --unsafe-perm..."
                export CXXFLAGS="--std=gnu++2a"
                npm ci --only=production --unsafe-perm
                which node
                node -v
                g++ --version
                echo $PATH
                
                echo "🔧 Fixing bin script permissions..."
                chmod -R u+x node_modules/.bin/* || true
            '''
                }
            }
        }

        stage('Debug Build Env') {
    steps {
        dir(env.PROJECT_DIR) {
            sh '''
                # Check if nest binary exists
                echo "🔍 Checking for nest binary..."
                ls -la node_modules/.bin/nest || echo "❌ nest binary not found"

                # Test if it's executable
                echo "📦 Testing nest --version..."
                ./node_modules/.bin/nest --version || echo "❌ Cannot run nest directly"

                # Check PATH
                echo "📌 Current PATH:"
                echo "$PATH"

                # Try npx
                echo "✅ Trying npx nest --version..."
                npx nest --version
                echo("ls -la node_modules/@nestjs/cli")
                ls -la node_modules/@nestjs/cli
            '''
        }
    }
}

        stage('Build Project') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy') {
            steps {
                dir(PROJECT_DIR) {
                    sh "pm2 reload ${PM2_ID}"
                }
            }
        }
    }
}




