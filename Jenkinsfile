pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        APP_DIR = '/var/www/node/wyze-care-backend'
        PM2_ID = '17'
    }

    options {
        timestamps()
        ansiColor('xterm')
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir("${APP_DIR}") {
                    sh 'npm ci'
                }
            }
        }

        stage('Build') {
            steps {
                dir("${APP_DIR}") {
                    sh 'npm run build'
                }
            }
        }

        stage('Test') {
            steps {
                dir("${APP_DIR}") {
                    sh 'npm run test'
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                dir("${APP_DIR}") {
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
