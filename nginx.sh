#!/bin/sh
nginx -t -p `pwd` -c nginx.conf
if [ $? -eq 0 ]; then
  nginx -p `pwd` -c nginx.conf
fi
