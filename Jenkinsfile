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
                echo "🧹 Cleaning..."
                rm -rf node_modules package-lock.json

                echo "🔧 Setting npm config..."
                npm config set ignore-scripts false

                echo "📦 Installing dependencies..."
                npm install --verbose

                echo "🔍 Checking nest binary..."
                ls -la node_modules/.bin/nest
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






