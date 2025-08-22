pipeline {
    agent { label 'node-deploy' }  // Ensure correct agent

    environment {
        NODE_ENV = 'production'
        PROJECT_DIR = '/var/www/node/wyze-care-backend'
        PM2_APP_NAME = 'wyze-care-backend'  // Use name, not ID
        PATH = "${env.PROJECT_DIR}/node_modules/.bin:${env.PATH}"
    }

    stages {
        stage('Pull Latest Code') {
            steps {
                script {
                    dir(PROJECT_DIR) {
                        if (!fileExists('package.json')) {
                            error "Project directory invalid or missing files: ${PROJECT_DIR}"
                        }
                        sh 'git pull origin main'
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'npm ci --only=production'  // Deterministic install
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

        stage('Restart Service') {
            steps {
                dir(PROJECT_DIR) {
                    sh 'pm2 restart ${PM2_APP_NAME} || pm2 start ecosystem.config.js'  // Fallback
                    sh 'pm2 save'  // Persist across reboots
                }
            }
        }
    }

    post {
        success {
            echo '✅ Deployment succeeded.'
            // slackSend(...)
        }
        failure {
            echo '❌ Deployment failed.'
            // slackSend(...)
        }
        always {
            cleanWs()  // Clean workspace if used
        }
    }
}
