/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
// + build js,wasm
package main

import (
	"fmt"
	"syscall/js"

	"github.com/seatgeek/node-hcl/hcl"
)

var jsGlobal js.Value
var jsRoot js.Value

const (
	bridgeJavaScriptName = "__node_hcl_wasm__"
)

func registerFn(name string, callback func(this js.Value, args []js.Value) (interface{}, error)) {
	jsRoot.Set(name, js.FuncOf(registrationWrapper(callback)))
}

func registrationWrapper(fn func(this js.Value, args []js.Value) (interface{}, error)) func(this js.Value, args []js.Value) interface{} {
	return func(this js.Value, args []js.Value) interface{} {
		cb := args[len(args)-1]

		ret, err := fn(this, args[:len(args)-1])

		if err != nil {
			cb.Invoke(err.Error(), js.Null())
		} else {
			cb.Invoke(js.Null(), ret)
		}

		return ret
	}
}

func main() {
	jsGlobal = js.Global().Get("global")
	jsRoot = jsGlobal.Get(bridgeJavaScriptName)
	c := make(chan struct{}, 0)

	registerFn("merge", func(this js.Value, args []js.Value) (interface{}, error) {
		if len(args) < 2 {
			return nil, fmt.Errorf("Not enough arguments, expected (2)")
		}

		aHclString := args[0].String()
		bHclString := args[1].String()
		return hcl.Merge(aHclString, bHclString)
	})

	<-c
}
