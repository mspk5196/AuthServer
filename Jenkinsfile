pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    COMPOSE_PROJECT_NAME = "auth-server"
    ENV_DIR = "/opt/envs"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verify Docker') {
      steps {
        sh '''
          docker --version
          docker compose version
        '''
      }
    }

    stage('Build Images') {
      steps {
        sh '''
          docker compose build
        '''
      }
    }

    stage('Deploy Services') {
      steps {
        script {
          try {
            echo "🚀 Deploying new version..."
            sh '''
              docker compose up -d
            '''
            echo "✅ Deployment successful"
          } catch (err) {
            echo "❌ Deployment failed, starting rollback..."

            // Rollback
            sh '''
              docker compose down
              docker compose up -d
            '''

            error("Rollback completed due to deployment failure")
          }
        }
      }
    }
  }

  post {
    failure {
      emailext(
        subject: "❌ DEPLOY FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        to: "mspk@mspkapps.in",
        mimeType: 'text/html',
        body: """
        <h2>Deployment Failed</h2>
        <p><b>Project:</b> ${env.JOB_NAME}</p>
        <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
        <p><b>Status:</b> FAILED (Rollback executed)</p>
        <p><b>Build URL:</b> <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
        <br/>
        <p>Please check Jenkins logs for details.</p>
        """
      )
    }

    success {
      echo "🎉 Deployment completed successfully"
    }
  }
}
