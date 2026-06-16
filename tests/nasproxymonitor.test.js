'use strict';

var request = require('supertest');
var express = require('express');

require('should');

var detectProxyStatus = require('../lib/api/status').detectProxyStatus;

function makeReq (headers, secure) {
  return { headers: headers || {}, secure: !!secure };
}

describe('NAS Proxy Monitor Status', function () {

  describe('/health endpoint', function () {
    var healthApp;

    before(function () {
      healthApp = express();
      healthApp.get('/health', function (req, res) {
        res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
      });
    });

    it('returns 200 with status ok', function (done) {
      request(healthApp)
        .get('/health')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.status.should.equal('ok');
          res.body.should.have.property('uptime');
          done();
        });
    });

    it('returns numeric uptime', function (done) {
      request(healthApp)
        .get('/health')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.uptime.should.be.a.Number();
          done();
        });
    });
  });

  describe('detectProxyStatus()', function () {
    it('reports isProxied false with no proxy headers', function () {
      var should = require('should');
      var result = detectProxyStatus(makeReq({}));
      result.isProxied.should.equal(false);
      should(result.forwardedFor).equal(null);
      should(result.realIp).equal(null);
      should(result.forwardedHost).equal(null);
    });

    it('falls back to http protocol when not secure and no forwarded-proto', function () {
      var result = detectProxyStatus(makeReq({}));
      result.protocol.should.equal('http');
    });

    it('falls back to https when req.secure is true', function () {
      var result = detectProxyStatus(makeReq({}, true));
      result.protocol.should.equal('https');
    });

    it('detects proxy via X-Forwarded-For', function () {
      var result = detectProxyStatus(makeReq({ 'x-forwarded-for': '192.168.1.100' }));
      result.isProxied.should.equal(true);
      result.forwardedFor.should.equal('192.168.1.100');
    });

    it('detects proxy via X-Forwarded-Proto and reports correct protocol', function () {
      var result = detectProxyStatus(makeReq({ 'x-forwarded-proto': 'https' }));
      result.isProxied.should.equal(true);
      result.protocol.should.equal('https');
    });

    it('detects proxy via X-Real-IP', function () {
      var result = detectProxyStatus(makeReq({ 'x-real-ip': '10.0.0.1' }));
      result.isProxied.should.equal(true);
      result.realIp.should.equal('10.0.0.1');
    });

    it('detects proxy via X-Forwarded-Host', function () {
      var result = detectProxyStatus(makeReq({ 'x-forwarded-host': 'nightscout.example.com' }));
      result.isProxied.should.equal(true);
      result.forwardedHost.should.equal('nightscout.example.com');
    });

    it('detects proxy when multiple NAS proxy headers are present', function () {
      var result = detectProxyStatus(makeReq({
        'x-forwarded-for': '192.168.1.100'
        , 'x-forwarded-proto': 'https'
        , 'x-real-ip': '192.168.1.100'
        , 'x-forwarded-host': 'nightscout.example.com'
      }));
      result.isProxied.should.equal(true);
      result.protocol.should.equal('https');
      result.forwardedFor.should.equal('192.168.1.100');
      result.realIp.should.equal('192.168.1.100');
      result.forwardedHost.should.equal('nightscout.example.com');
    });
  });
});
