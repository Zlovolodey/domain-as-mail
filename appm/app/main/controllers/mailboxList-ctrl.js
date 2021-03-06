'use strict'
angular.module('main')
  .controller('MailboxCtrlList', function (debug, PDD, $q, $window, $scope, $stateParams, $ionicModal, $ionicPopup, $ionicHistory) {
    var alert = $window.alert
    var log = debug('app:domain:mailboxList')
    var mailboxList = this
    mailboxList.domain = $stateParams.domain
    mailboxList.owner = $stateParams.owner

    var isNotBlocked = function (account) {
      return 'yes' === account.enabled
    }
    mailboxList.isBlocked = function (account) {
      return !isNotBlocked(account)
    }

    var isNotMaillist = function (account) {
      return (account.maillist === 'no')
    }

    $scope.newAccount = {
      login: '',
      password: ''
    }

    mailboxList.doRefresh = function () {
      return PDD.email.query(mailboxList.domain)
        .then(function (result) {
          mailboxList.accounts = result.accounts.reduce(function(prev, cur) {
            cur.prefix = cur.login.split('@')[0]
            return prev.concat(angular.isArray(cur) ? cur : [cur])
          }, []).filter(isNotMaillist)
        })
        .then(function () {
          mailboxList.accounts
            .filter(isNotBlocked)
            .map(function (acc) {
              log('acc', acc)
              var
                params = {
                  domain: mailboxList.domain,
                  login: acc.login.toLowerCase(),
                }
              return PDD.email.countersMailbox(params)
                .then(function (result) {
                  acc.counters = result.counters
                })
            })
        })
        .catch(function (err) {
          log('error code: ' + err.code)
          throw err
        })
        .finally(function () {
          $scope.$broadcast('scroll.refreshComplete')
        })
    }

    mailboxList.doRefresh()

    mailboxList.goBack = function () {
      $ionicHistory.goBack()
    }

    mailboxList.refreshAccounts = function () {
      var log = debug('app:domain:accounts')
      return PDD.email.query(mailboxList.domain)
        .then(function (result) {
          mailboxList.accounts = result.accounts.reduce(function(prev, cur) {
            cur.prefix = cur.login.split('@')[0]
            return prev.concat(angular.isArray(cur) ? cur : [cur])
          }, []) || []
          log('accounts loaded ' + mailboxList.accounts.length)
        })
        .catch(function (err) {
          log('error code: ' + err.code)
          throw err
        })
    }

    mailboxList.deleteMailbox = function (account) {
      var params = {
        domain: mailboxList.domain,
        uid: account.uid
      }
      $ionicPopup.confirm({
        title: 'Подвердите удаление',
        template: 'Вы уверены, что хотите удалить почтовый ящик ' + account.login + '?',
        cancelText: 'Отмена',
        confirmText: 'ОК'
      }).then(function (res) {
        if (res) {
          PDD.email.removeMailbox(params)
            .then(function (result) {
              if (result.success && 'ok' === result.success) {
                mailboxList.doRefresh()
              }
              else {
                throw result
              }
            }, function (err) {
              alert('Ошибка ' + angular.toJson(err))
            })
        }
      })
    }

  })
