//originating source - http://mandubian.com/2012/08/27/understanding-play2-iteratees-for-normal-humans/
def stepTailRecurse(l: List[Int]) = {
  def step(l: List[Int], total: Int): Int = {
    l match {
      case List() => 
      	println("Total: " + total.toString)
      	total
      case List(elt) => 
        println("Old Total: " + total.toString)
        println("Last Element: " + elt.toString)
        val newTotal = total + elt
        println("New Total: " + newTotal.toString)
        newTotal
      case head :: tail => 
      	println("head: " + head + " tail: " + tail)
      	step(tail,
      		{ 
      		val eval = total + head 
      		println("Evaluation!: " + eval.toString)
      		eval

      	 })
    }
  }

  step(l, 0)
}