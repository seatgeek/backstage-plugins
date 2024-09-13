#!/bin/bash
#
# Copyright SeatGeek
# Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
#
echo "Running go tests"
go test $(find . -name '*_test.go')
