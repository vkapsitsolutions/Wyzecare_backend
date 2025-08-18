pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        PROJECT_DIR = '/var/www/node/wyze-care-backend'
        PM2_ID = '17'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'npm i'
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


