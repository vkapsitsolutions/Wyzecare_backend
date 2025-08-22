pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        PROJECT_DIR = '/var/www/node/wyze-care-backend'
        PM2_ID = '17'
        PATH = "${env.PROJECT_DIR}/node_modules/.bin:${env.PATH}"
    }

    stages {
        
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
                    sh 'pwd'
                    sh 'npm ci --only=production'
                }
            }
        }

        stage('Build') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'npm run build'
                }
            }
        }


        stage('Deploy') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'pm2 restart ${PM2_ID}'
                }
            }
        }
    }

    post {
        success {
            echo '✅ Deployment completed successfully.'
        }
        failure {
            echo '❌ Deployment failed.'
        }
    }
}

