pipeline {
  agent any

  options {
    timestamps()
  }

  stages {

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
        sh '''
          docker compose down
          docker compose up -d
        '''
      }
    }
  }

  post {
    success {
      echo '✅ Deployment successful'
    }
    failure {
      echo '❌ Deployment failed'
    }
  }
}
