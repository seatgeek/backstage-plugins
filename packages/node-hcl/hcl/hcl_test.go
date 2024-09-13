/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
package hcl_test

import (
	"testing"

	"github.com/seatgeek/node-hcl/hcl"
	"github.com/stretchr/testify/assert"
)

func TestMerge(t *testing.T) {
	t.Parallel()

	type input struct {
		a string
		b string
	}

	tests := []struct {
		name    string
		input   input
		want    string
		wantErr error
	}{
		{
			name: "merge simple",
			input: input{
				a: `variable "a" {
  type        = string
  description = "Variable A"
  default     = "a"
}`,
				b: `variable "b" {
  type        = string
  description = "Variable B"
  default     = "b"
}`,
			},
			want: `variable "a" {
  type        = string
  description = "Variable A"
  default     = "a"
}

variable "b" {
  type        = string
  description = "Variable B"
  default     = "b"
}
`,
			wantErr: nil,
		},
		{
			name: "merge duplicate",
			input: input{
				a: `variable "a" {
  type        = string
  description = "Variable A"
  override    = false
  a					  = "a"
}`,
				b: `variable "a" {
  type        = string
  description = "Variable A"
  override    = true
	b           = "b"
}`,
			},
			want: `variable "a" {
  a           = "a"
  description = "Variable A"
  override    = true
  type        = string
  b           = "b"
}

`,
			wantErr: nil,
		},
		{
			name: "merge nested",
			input: input{
				a: `monitor "a" {
  description = "Monitor A"
  
  threshold {
    critical = 90
    warning = 80
  }
}`,
				b: `monitor "a" {
  description = "Monitor A"
  
  threshold {
    critical = 100
    recovery = 10
  }
}`,
			},
			want: `monitor "a" {
  description = "Monitor A"

  threshold {
    critical = 100
    warning  = 80
    recovery = 10
  }
}

`,
			wantErr: nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := hcl.Merge(tc.input.a, tc.input.b)
			assert.Equal(t, tc.want, got)

			if tc.wantErr != nil {
				assert.ErrorIs(t, tc.wantErr, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
