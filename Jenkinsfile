pipeline {
    agent any

    environment {
        PROJECT_DIR = '/var/www/node/wyze-care-backend'
        PM2_ID = '17'
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


