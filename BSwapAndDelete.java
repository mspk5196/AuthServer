import java.util.*;
public class BSwapAndDelete{
    public static void main(String[] args){
        Scanner sc = new Scanner(System.in);
        int t = sc.nextInt();
        while(t-->0){
            String s  = sc.next();
            int ones = 0, zeros = 0;
            for(int i=0; i<s.length(); i++){
                if(s.charAt(i) == '1'){
                    ones++;
                }
                else{
                    zeros++;
                }
            }
            for(int i=0;i<s.length();i++){
                if(s.charAt(i)=='1'){
                    if(zeros>0){
                    zeros--;
                    }
                    else{
                        break;
                    }
                }
                else{
                    if(ones>0){
                        ones--;
                    }
                    else{
                        break;
                    }
                }
            }
            System.out.println(ones+zeros);
        }
    }
}