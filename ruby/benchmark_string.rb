require 'benchmark'
n = 1000000
attr_accessor = :a_str_single, :b_str_single, :a_str_double, :b_str_double
@a_str_single = 'a string'
@b_str_single = 'b string'
@a_str_double = "a string"
@b_str_double = "b string"
@did_print = false
def reset!#(a_str_single,b_str_single,a_str_double,b_str_double)
	@a_str_single = 'a string'
	@b_str_single = 'b string'
	@a_str_double = "a string"
	@b_str_double = "b string"
end
Benchmark.bm do |x|
	x.report('assign single       ') { n.times do; c = 'a string'; end}
	x.report('assign via << single') { c =''; n.times do; c << 'a string'; end}
	x.report('assign double       ') { n.times do; c = "a string"; end}
	x.report('assing interp       ') { n.times do; c = "a string #{'b string'}"; end}
	x.report('concat single       ') { n.times do; 'a string ' + 'b string'; end}
	x.report('concat double       ') { n.times do; "a string " + "b string"; end}
	x.report('concat single interp') { n.times do; "#{@a_str_single}#{@b_str_single}"; end}
	x.report('concat single <<    ') { n.times do; @a_str_single << @b_str_single; end}
	reset!
	# unless @did_print
	# 	@did_print = true
	# 	puts @a_str_single.length 
	# 	puts " a_str_single: #{@a_str_single} , b_str_single: #{@b_str_single} !!"
	# end
	x.report('concat double interp') { n.times do; "#{@a_str_double}#{@b_str_double}"; end}
	x.report('concat double <<    ') { n.times do; @a_str_double << @b_str_double; end}
end